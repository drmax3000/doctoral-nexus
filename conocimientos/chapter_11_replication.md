---
source: Database Internals.pdf
pages: 340-380
extraction_date: 2026-07-03 12:49:09
---

# **Chapter 11. Replication and Consistency** 

Before we move on to discuss consensus and atomic commitment algorithms, let’s put together the last piece required for their in-depth understanding: _consistency models_ . Consistency models are important, since they explain visibility semantics and behavior of the system in the presence of multiple copies of data. 

_Fault tolerance_ is a property of a system that can continue operating correctly in the presence of failures of its components. Making a system fault-tolerant is not an easy task, and it may be difficult to add fault tolerance to the existing system. The primary goal is to remove a single point of failure from the system and make sure that we have redundancy in mission-critical components. Usually, redundancy is entirely transparent for the user. 

A system can continue operating correctly by storing multiple copies of data so that, when one of the machines fails, the other one can serve as a failover. In systems with a single source of truth (for example, primary/replica databases), failover can be done explicitly, by promoting a replica to become a new master. Other systems do not require explicit reconfiguration and ensure consistency by collecting responses from multiple participants during read and write queries. 

Data _replication_ is a way of introducing redundancy by maintaining multiple copies of data in the system. However, since updating multiple copies of data atomically is a problem equivalent to consensus [MILOSEVIC11], it might be quite costly to perform this operation for _every_ operation in the database. We can explore some more cost-effective and flexible ways to make data _look_ consistent from the user’s perspective, while allowing some degree of divergence between participants. 

Replication is particularly important in multidatacenter deployments. Georeplication, in this case, serves multiple purposes: it increases availability and the ability to withstand a failure of one or more datacenters by 

providing redundancy. It can also help to reduce the latency by placing a copy of data physically closer to the client. 

When data records are modified, their copies have to be updated accordingly. When talking about replication, we care most about three events: _write_ , _replica update_ , and _read_ . These operations trigger a sequence of events initiated by the client. In some cases, updating replicas can happen after the write has finished from the client perspective, but this still does not change the fact that the client has to be able to observe operations in a particular order. 

## **Achieving Availability** 

We’ve talked about the fallacies of distributed systems and have identified many things that can go wrong. In the real world, nodes aren’t always alive or able to communicate with one another. However, intermittent failures should not impact _availability_ : from the user’s perspective, the system as a whole has to continue operating as if nothing has happened. 

System availability is an incredibly important property: in software engineering, we always strive for high availability, and try to minimize downtime. Engineering teams brag about their uptime metrics. We care so much about availability for several reasons: software has become an integral part of our society, and many important things cannot happen without it: bank transactions, communication, travel, and so on. 

For companies, lack of availability can mean losing customers or money: you can’t shop in the online store if it’s down, or transfer the money if your bank’s website isn’t responding. 

To make the system highly available, we need to design it in a way that allows handling failures or unavailability of one or more participants gracefully. For that, we need to introduce redundancy and replication. However, as soon as we add redundancy, we face the problem of keeping several copies of data in sync and have to implement recovery mechanisms. 

## **Infamous CAP** 

_Availability_ is a property that measures the ability of the system to serve a response for every request successfully. The theoretical definition of availability mentions eventual response, but of course, in a real-world system, we’d like to avoid services that take indefinitely long to respond. 

Ideally, we’d like every operation to be _consistent_ . Consistency is defined here as atomic or _linearizable_ consistency (see “Linearizability”). Linearizable history can be expressed as a sequence of instantaneous operations that preserves the original operation order. Linearizability simplifies reasoning about the possible system states and makes a distributed system appear as if it was running on a single machine. 

We would like to achieve both consistency and availability while tolerating network partitions. The network can get split into several parts where processes are not able to communicate with each other: some of the messages sent between partitioned nodes won’t reach their destinations. 

Availability requires any nonfailing node to deliver results, while consistency requires results to be linearizable. CAP conjecture, formulated by Eric Brewer, discusses trade-offs between Consistency, Availability, and Partition tolerance [BREWER00]. 

Availability requirement is impossible to satisfy in an asynchronous system, and we cannot implement a system that simultaneously guarantees both _availability_ and _consistency_ in the presence of _network partitions_ [GILBERT02]. We can build systems that guarantee strong consistency while providing _best effort_ availability, or guarantee availability while providing _best effort_ consistency [GILBERT12]. Best effort here implies that if everything works, the system will not _purposefully_ violate any guarantees, but guarantees are allowed to be weakened and violated in the case of network partitions. 

In other words, CAP describes a continuum of potential choices, where on different sides of the spectrum we have systems that are: 

#### _Consistent and partition tolerant_ 

CP systems prefer failing requests to serving potentially inconsistent 

data. 

#### _Available and partition tolerant_ 

AP systems loosen the consistency requirement and allow serving potentially inconsistent values during the request. 

An example of a CP system is an implementation of a consensus algorithm, requiring a majority of nodes for progress: always consistent, but might be unavailable in the case of a network partition. A database always accepting writes and serving reads as long as even a single replica is up is an example of an AP system, which may end up losing data or serving inconsistent results. 

PACELEC conjecture [ABADI12], an extension of CAP, states that in presence of network partitions there’s a choice between consistency and availability (PAC). Else (E), even if the system is running normally, we _still_ have to make a choice between latency and consistency. 

### **Use CAP Carefully** 

It’s important to note that CAP discusses _network partitions_ rather than _node crashes_ or any other type of failure (such as crash-recovery). A node, partitioned from the rest of the cluster, can serve inconsistent requests, but a crashed node will not respond at all. On the one hand, this implies that it’s not necessary to have any nodes down to face consistency problems. On the other hand, this isn’t the case in the real world: there are many different failure scenarios (some of which can be simulated with network partitions). 

CAP implies that we can face consistency problems even if all the nodes are up, but there are connectivity issues between them since we expect every nonfailed node to respond correctly, with no regard to how many nodes may be down. 

CAP conjecture is sometimes illustrated as a triangle, as if we could turn a knob and have more or less of all of the three parameters. However, while we can turn a knob and trade consistency for availability, partition tolerance is a property we cannot realistically tune or trade for anything [HALE10]. 

#### **TIP** 

Consistency in CAP is defined quite differently from what ACID (see Chapter 5) defines as consistency. ACID consistency describes transaction consistency: transaction brings the database from one valid state to another, maintaining all the database invariants (such as uniqueness constraints and referential integrity). In CAP, it means that operations are _atomic_ (operations succeed or fail in their entirety) and _consistent_ (operations never leave the data in an inconsistent state). 

Availability in CAP is also different from the aforementioned _high availability_ [KLEPPMANN15]. The CAP definition puts no bounds on execution latency. Additionally, availability in databases, contrary to CAP, doesn’t require _every_ nonfailed node to respond to _every_ request. 

CAP conjecture is used to explain distributed systems, reason about failure scenarios, and evaluate possible situations, but it’s important to remember that there’s a fine line between _giving up_ consistency and serving 

unpredictable results. 

Databases that claim to be on the availability side, when used correctly, are still able to serve consistent results from replicas, given there are enough replicas alive. Of course, there are more complicated failure scenarios and CAP conjecture is just a rule of thumb, and it doesn’t necessarily tell the whole truth.<sup>1</sup> 

### **Harvest and Yield** 

CAP conjecture discusses consistency and availability only in their strongest forms: _linearizability_ and the ability of the system to eventually respond to every request. This forces us to make a hard trade-off between the two properties. However, some applications can benefit from slightly relaxed assumptions and we can think about these properties in their weaker forms. 

_either_ consistent _or_ Instead of being available, systems can provide relaxed guarantees. We can define two tunable metrics: _harvest_ and _yield_ , choosing between which still constitutes correct behavior [FOX99]: 

#### _Harvest_ 

Defines how complete the query is: if the query has to return 100 rows, but can fetch only 99 due to unavailability of some nodes, it still can be better than failing the query completely and returning nothing. 

#### _Yield_ 

Specifies the number of requests that were completed successfully, compared to the total number of attempted requests. Yield is different from the uptime, since, for example, a busy node is not down, but still can fail to respond to some of the requests. 

This shifts the focus of the trade-off from the absolute to the relative terms. We can trade harvest for yield and allow some requests to return incomplete data. One of the ways to increase yield is to return query results only from the available partitions (see “Database Partitioning”). For example, if a subset of nodes storing records of some users is down, we can still continue serving requests for other users. Alternatively, we can require the critical application data to be returned only in its entirety, but allow some deviations for other requests. 

Defining, measuring, and making a conscious choice between harvest and yield helps us to build systems that are more resilient to failures. 

## **Shared Memory** 

For a client, the distributed system storing the data acts as if it has shared storage, similar to a single-node system. Internode communication and message passing are abstracted away and happen behind the scenes. This creates an illusion of a shared memory. 

A single unit of storage, accessible by read or write operations, is usually called a _register_ . We can view _shared memory_ in a distributed database as an array of such registers. 

We identify every operation by its _invocation_ and _completion_ events. We define an operation as _failed_ if the process that invoked it crashes before it completes. If both invocation and completion events for one operation happen before the other operation is invoked, we say that this operation _precedes_ the other one, and these two operations are _sequential_ . _concurrent_ . Otherwise, we say that they are 

In Figure 11-1, you can see processes P1 and P2 executing different operations: 

- a) The operation performed by process P2 starts _after_ the operation executed by P1 has already finished, and the two operations are _sequential_ . 

- b) There’s an overlap between the two operations, so these operations are _concurrent_ . 

- c) The operation executed by P2 starts _after_ and completes _before_ the operation executed by P1 . These operations are _concurrent_ , too. 


![](C:/estudios_doctoral_v2/Desarrollo_Movil/doctoral-nexus/conocimientos/chapter_11_replication_images/Database_Internals.pdf-0348-08.png)


_Figure 11-1. Sequential and concurrent operations_ 

Multiple readers or writers can access the register simultaneously. Read and write operations on registers are _not immediate_ and take some time. 

Concurrent read/write operations performed by different processes are not _serial_ : depending on how registers behave when operations overlap, they might be ordered differently and may produce different results. Depending on how the register behaves in the presence of concurrent operations, we distinguish among three types of registers: 

#### _Safe_ 

Reads to the safe registers may return _arbitrary_ values within the range of the register during a concurrent write operation (which does not sound very practical, but might describe the semantics of an asynchronous system that does not impose the order). Safe registers with binary values might appear to be _flickering_ (i.e., returning results alternating between the two values) during reads concurrent to writes. 

#### _Regular_ 

For regular registers, we have slightly stronger guarantees: a read operation can return only the value written by the most recent _completed_ write or the value written by the write operation that overlaps with the current read. In this case, the system has some notion of order, but write results are not visible to all the readers simultaneously (for example, this may happen in a replicated database, where the master accepts writes and replicates them to workers serving reads). 

#### _Atomic_ 

Atomic registers guarantee linearizability: every write operation has a single moment before which every read operation returns an old value and after which every read operation returns a new one. Atomicity is a fundamental property that simplifies reasoning about the system state. 

## **Ordering** 

When we see a sequence of events, we have some intuition about their execution order. However, in a distributed system it’s not always that easy, because it’s hard to know when _exactly_ something has happened and have this information available instantly across the cluster. Each participant may have its view of the state, so we have to look at every operation and define it in terms of its _invocation_ and _completion_ events and describe the operation bounds. 

Let’s define a system in which processes can execute read(register) and write(register, value) operations on shared registers. Each process executes its own set of operations sequentially (i.e., every invoked operation has to complete before it can start the next one). The combination of sequential process executions forms a global history, in which operations can be executed concurrently. 

The simplest way to think about consistency models is in terms of read and write operations and ways they can overlap: read operations have no side effects, while writes change the register state. This helps to reason about when exactly data becomes readable after the write. For example, consider a history in which two processes execute the following events concurrently: 

Process 1:      Process 2: write(x, 1)     read(x) read(x) 

When looking at these events, it’s unclear what is an outcome of the read(x) operations in both cases. We have several possible histories: 

Write completes before both reads. 

Write and two reads can get interleaved, and can be executed between the reads. 

Both reads complete before the write. 

There’s no simple answer to what should happen if we have just one copy 

of data. In a replicated system, we have more combinations of possible states, and it can get even more complicated when we have multiple processes reading and writing the data. 

If all of these operations were executed by the single process, we could enforce a strict order of events, but it’s harder to do so with multiple processes. We can group the potential difficulties into two groups: 

Operations may overlap. 

Effects of the nonoverlapping calls might not be visible immediately. 

To reason about the operation order and have nonambiguous descriptions of possible outcomes, we have to define consistency models. We discuss concurrency in distributed systems in terms of shared memory and concurrent systems, since most of the definitions and rules defining consistency still apply. Even though a lot of terminology between concurrent and distributed systems overlap, we can’t directly apply most of the concurrent algorithms, because of differences in communication patterns, performance, and reliability. 

## **Consistency Models** 

Since operations on shared memory registers are allowed to overlap, we should define clear semantics: what happens if multiple clients read or modify different copies of data simultaneously or within a short period. There’s no single right answer to that question, since these semantics are different depending on the application, but they are well studied in the context of consistency models. 

_Consistency models_ provide different semantics and guarantees. You can think of a consistency model as a contract between the participants: what each replica has to do to satisfy the required semantics, and what users can expect when issuing read and write operations. 

Consistency models describe what expectations clients might have in terms of possible returned values despite the existence of multiple copies of data and concurrent accesses to it. In this section, we will discuss _single-operation_ consistency models. 

Each model describes how far the behavior of the system is from the behavior we might expect or find natural. It helps us to distinguish between “all possible histories” of interleaving operations and “histories permissible under model X,” which significantly simplifies reasoning about the visibility of state changes. 

We can think about consistency from the perspective of _state_ , describe which state invariants are acceptable, and establish allowable relationships between copies of the data placed onto different replicas. Alternatively, we can consider _operation_ consistency, which provides an outside view on the data store, describes operations, and puts constraints on the order in which they occur [TANENBAUM06] [AGUILERA16]. 

Without a global clock, it is difficult to give distributed operations a precise and deterministic order. It’s like a Special Relativity Theory for data: every participant has its own perspective on state and time. 

Theoretically, we could grab a system-wide lock every time we want to change the system state, but it’d be highly impractical. Instead, we use a set of rules, definitions, and restrictions that limit the number of possible histories and outcomes. 

Consistency models add another dimension to what we discussed in “Infamous CAP”. Now we have to juggle not only consistency and availability, but also consider consistency in terms of synchronization costs [ATTIYA94]. Synchronization costs may include latency, additional CPU cycles spent executing additional operations, disk I/O used to persist recovery information, wait time, network I/O, and everything else that can be prevented by avoiding synchronization. 

First, we’ll focus on visibility and propagation of operation results. Coming back to the example with concurrent reads and writes, we’ll be able to limit the number of possible histories by either positioning dependent writes after one another or defining a point at which the new value is propagated. 

We discuss consistency models in terms of _processes_ (clients) issuing read and write operations against the database state. Since we discuss consistency in the context of replicated data, we assume that the database can have multiple replicas. 

### **Strict Consistency** 

_Strict consistency_ is the equivalent of complete replication transparency: any write by any process is instantly available for the subsequent reads by any process. It involves the concept of a global clock and, if there was a write(x, 1) at instant t1 , any read(x) will return a newly written value 1 at instant t > t . _any_ 2 1 

Unfortunately, this is just a theoretical model, and it’s impossible to implement, as the laws of physics and the way distributed systems work set limits on how fast things may happen [SINHA97]. 

### **Linearizability** 

_Linearizability_ is the strongest single-object, single-operation consistency model. Under this model, effects of the write become visible to all readers exactly once at some point in time between its start and end, and no client can observe state transitions or side effects of partial (i.e., unfinished, still in-flight) or incomplete (i.e., interrupted before completion) write operations [LEE15]. 

Concurrent operations are represented as one of the possible sequential histories for which visibility properties hold. There is some indeterminism in linearizability, as there may exist more than one way in which the events can be ordered [HERLIHY90]. 

If two operations overlap, they may take effect in any order. All read operations that occur after write operation completion can observe the effects of this operation. As soon as a single read operation returns a particular value, all reads that come after it return the value _at least_ as recent as the one it returns [BAILIS14a]. 

There is some flexibility in terms of the order in which concurrent events occur in a global history, but they cannot be reordered arbitrarily. Operation results should not become effective before the operation starts as that would require an oracle able to predict future operations. At the same time, results have to take effect before completion, since otherwise, we cannot define a linearization point. 

Linearizability respects both sequential process-local operation order and the order of operations running in parallel relative to other processes, and defines a _total order_ of the events. 

This order should be _consistent_ , which means that every read of the shared value should return the latest value written to this shared variable preceding this read, or the value of a write that overlaps with this read. Linearizable write access to a shared variable also implies mutual exclusion: between the two concurrent writes, only one can go first. 

Even though operations are concurrent and have some overlap, their effects become visible in a way that makes them appear sequential. No operation happens instantaneously, but still _appears_ to be atomic. 

#### Let’s consider the following history: 

Process 1:      Process 2:     Process 3: write(x, 1)     write(x, 2)    read(x) read(x) read(x) 

In Figure 11-2, we have three processes, two of which perform write operations on the register x , which has an initial value of ∅ . Read operations can observe these writes in one of the following ways: 

- a) The first read operation can return 1 , 2 , or ∅ (the initial value, a state before both writes), since both writes are still in-flight. The first read can get ordered _before_ both writes, _between_ the first and second writes, and _after_ both writes. 

- b) The second read operation can return only 1 and 2 , since the first write has completed, but the second write didn’t return yet. 

- c) The third read can only return 2 , since the second write is ordered after the first. 


![](C:/estudios_doctoral_v2/Desarrollo_Movil/doctoral-nexus/conocimientos/chapter_11_replication_images/Database_Internals.pdf-0356-06.png)


_Figure 11-2. Example of linearizability_ 

#### **Linearization point** 

One of the most important traits of linearizability is visibility: once the operation is complete, everyone must see it, and the system can’t “travel back in time,” reverting it or making it invisible for some participants. In other words, linearization prohibits stale reads and requires reads to be monotonic. 

This consistency model is best explained in terms of atomic (i.e., uninterruptible, indivisible) operations. Operations do not have to _be_ instantaneous (also because there’s no such thing), but their _effects_ have to 

become visible at some point in time, making an illusion that they were instantaneous. This moment is called a _linearization point_ . 

Past the linearization point of the write operation (in other words, when the value becomes visible for other processes) every process has to see either the value this operation wrote or some later value, if some additional write operations are ordered after it. A visible value should remain stable until the next one becomes visible after it, and the register should not alternate between the two recent states. 

#### **NOTE** 

Most of the programming languages these days offer atomic primitives that allow atomic write and compare-and-swap (CAS) operations. Atomic write operations do not consider current register values, unlike CAS, that move from one value to the next only when the previous value is unchanged [HERLIHY94]. Reading the value, modifying it, and then writing it with CAS is more complex than simply checking and setting the value, because of the possible _ABA problem_ [DECHEV10]: if CAS expects the value A to be present in the register, it will be installed even if the value B was set and then switched back to A by the other two concurrent write operations. In other words, the presence of the value A alone does not guarantee that the value hasn’t been changed since the last read. 

The linearization point serves as a cutoff, after which operation effects become visible. We can implement it by using locks to guard a critical section, atomic read/write, or read-modify-write primitives. 

Figure 11-3 shows that linearizability assumes hard time bounds and the clock is _real time_ , so the operation effects have to become visible _between_ t1 , when the operation request was issued, and t2 , when the process received a response. 


![](C:/estudios_doctoral_v2/Desarrollo_Movil/doctoral-nexus/conocimientos/chapter_11_replication_images/Database_Internals.pdf-0357-06.png)


_Figure 11-3. Time bounds of a linearizable operation_ 

Figure 11-4 illustrates that the linearization point _cuts_ the history into _before_ and _after_ . Before the linearization point, the old value is visible, 

after it, the new value is visible. 


![](C:/estudios_doctoral_v2/Desarrollo_Movil/doctoral-nexus/conocimientos/chapter_11_replication_images/Database_Internals.pdf-0358-01.png)


_Figure 11-4. Linearization point_ 

#### **Cost of linearizability** 

Many systems avoid implementing linearizability today. Even CPUs do not offer linearizability when accessing main memory by default. This has happened because synchronization instructions are expensive, slow, and involve cross-node CPU traffic and cache invalidations. However, it is possible to implement linearizability using low-level primitives [MCKENNEY05a], [MCKENNEY05b]. 

In concurrent programming, you can use compare-and-swap operations to introduce linearizability. Many algorithms work by _preparing_ results and then using CAS for swapping pointers and _publishing_ them. For example, we can implement a concurrent queue by creating a linked list node and then atomically appending it to the tail of the list [KHANCHANDANI18]. 

In distributed systems, linearizability requires coordination and ordering. It _consensus_ can be implemented using : clients interact with a replicated store using messages, and the consensus module is responsible for ensuring that applied operations are consistent and identical across the cluster. Each write operation will appear instantaneously, exactly once at some point between its invocation and completion events [HOWARD14]. 

Interestingly, linearizability in its traditional understanding is regarded as a _local_ property and implies composition of independently implemented and verified elements. Combining linearizable histories produces a history that is also linearizable [HERLIHY90]. In other words, a system in which all objects are linearizable, is also linearizable. This is a very useful property, but we should remember that its scope is limited to a single object and, even though operations on two independent objects are linearizable, 

operations that involve both objects have to rely on additional synchronization means. 

##### **REUSABLE INFRASTRUCTURE FOR LINEARIZABILITY** 

Reusable Infrastructure for Linearizability (RIFL), is a mechanism for implementing linearizable remote procedure calls (RPCs) [LEE15]. In RIFL, messages are uniquely identified with the client ID and a client-local monotonically increasing sequence number. 

To assign client IDs, RIFL uses _leases_ , issued by the system-wide service: unique identifiers used to establish uniqueness and break sequence number ties. If the failed client tries to execute an operation using an expired lease, its operation will not be committed: the client has to receive a new lease and retry. 

If the server crashes before it can acknowledge the write, the client may attempt to retry this operation without knowing that it has already been applied. We can even end up in a situation in which client C1 writes value V1 , but doesn’t receive an acknowledgment. Meanwhile, client C2 writes value V2 . If C1 retries its operation and successfully writes V1 , the write of C2 would be lost. To avoid this, the system needs to prevent repeated execution of retried operations. When the client retries the operation, instead of reapplying it, RIFL returns a completion object, indicating that the operation it’s associated with has already been executed, and returns its result. 

Completion objects are stored in a durable storage, along with the actual data records. However, their lifetimes are different: the completion object should exist until either the issuing client promises it won’t retry the operation associated with it, or until the server detects a client crash, in which case all completion objects associated with it can be safely removed. Creating a completion object should be atomic with the mutation of the data record it is associated with. 

Clients have to periodically renew their leases to signal their liveness. If the client fails to renew its lease, it is marked as crashed and all the data associated with its lease is garbage collected. Leases have a limited lifetime to make sure that operations that belong to the failed process won’t be retained in the log forever. If the failed client tries to continue operation using an expired lease, its results will not be committed and the client will have to start from scratch. 

The advantage of RIFL is that, by guaranteeing that the RPC cannot be executed more than once, an operation can be made linearizable by ensuring that its results are made visible atomically, and most of its implementation details are independent from the underlying storage system. 

### **Sequential Consistency** 

Achieving linearizability might be too expensive, but it is possible to relax the model, while still providing rather strong consistency guarantees. _Sequential consistency_ allows ordering operations as if they were executed in _some_ sequential order, while requiring operations of each individual process to be executed in the same order they were performed by the process. 

Processes can observe operations executed by other participants in the order consistent with their own history, but this view can be arbitrarily stale from the global perspective [KINGSBURY18a]. Order of execution _between_ processes is undefined, as there’s no shared notion of time. 

Sequential consistency was initially introduced in the context of concurrency, describing it as a way to execute multiprocessor programs correctly. The original description required memory requests to the same cell to be ordered in the queue (FIFO, arrival order), did not impose global ordering on the overlapping writes to independent memory cells, and allowed reads to fetch the value from the memory cell, or the latest value from the queue if the queue was nonempty [LAMPORT79]. This example helps to understand the semantics of sequential consistency. Operations can be ordered in different ways (depending on the arrival order, or even arbitrarily in case two writes arrive simultaneously), but all processes _observe_ the operations in the same order. 

Each process can issue read and write requests in an order specified by its own program, which is very intuitive. Any nonconcurrent, single-threaded program executes its steps this way: one after another. All write operations propagating from the same process appear in the order they were submitted by this process. Operations propagating from different sources may be ordered _arbitrarily_ , but this order will be consistent from the readers’ perspective. 

#### **NOTE** 

Sequential consistency is often confused with linearizability since both have similar semantics. Sequential consistency, just as linearizability, requires operations to be globally ordered, but linearizability requires the local order of each process and global 

order to be consistent. In other words, linearizability respects a real-time operation order. Under sequential consistency, ordering holds only for the same-origin writes [VIOTTI16]. Another important distinction is composition: we can combine linearizable histories and still expect results to be linearizable, while sequentially consistent schedules are not composable [ATTIYA94]. 

Figure 11-5 shows how write(x,1) and write(x,2) can become visible to P3 and P4 . Even though in wall-clock terms, 1 was written _before_ 2 , it can get ordered after 2 . At the same time, while P3 already reads the value 1 , P4 can still read 2 . However, _both_ orders, 1 → 2 and 2 → 1 , are valid, as long as they’re consistent for different readers. What’s important here is that both P3 and P4 have observed values _in the same order_ : first 2 , and then 1 [TANENBAUM14]. 


![](C:/estudios_doctoral_v2/Desarrollo_Movil/doctoral-nexus/conocimientos/chapter_11_replication_images/Database_Internals.pdf-0361-02.png)


_Figure 11-5. Ordering in sequential consistency_ 

Stale reads can be explained, for example, by replica divergence: even though writes propagate to different replicas in the same order, they can arrive there at different times. 

The main difference with linearizability is the absence of globally enforced time bounds. Under linearizability, an operation has to become effective W₁ within its wall-clock time bounds. By the time the write operation completes, its results have to be applied, and every reader should be able to see the value _at least_ as recent as one written by W₁ . Similarly, after a R₁ read operation returns, any read operation that happens after it should return the value that R₁ has seen or a later value (which, of course, has to follow the same rule). 

Sequential consistency relaxes this requirement: an operation’s results can become visible _after_ its completion, as long as the order is consistent from the individual processors’ perspective. Same-origin writes can’t “jump” over each other: their program order, relative to their own executing 

process, has to be preserved. The other restriction is that the order in which operations have appeared must be consistent for _all_ readers. 

Similar to linearizability, modern CPUs do not guarantee sequential consistency by default and, since the processor can reorder instructions, we should use memory barriers (also called fences) to make sure that writes become visible to concurrently running threads in order [DREPPER07] [GEORGOPOULOS16]. 

### **Causal Consistency** 

You see, there is only one constant, one universal, it is the only real truth: causality. Action. Reaction. Cause and effect. Merovingian from _The Matrix Reloaded_ 

Even though having a global operation order is often unnecessary, it might be necessary to establish order between _some_ operations. Under the _causal consistency_ model, all processes have to see _causally related_ operations in the same order. _Concurrent writes_ with no causal relationship can be observed in a different order by different processors. 

First, let’s take a look at _why_ we need causality and how writes that have P and P no causal relationship can propagate. In Figure 11-6, processes 1 2 make writes that _aren’t_ causally ordered. The results of these operations can propagate to readers at different times and out of order. Process P3 will see the value 1 before it sees 2 , while P4 will first see 2 , and then 1 . 


![](C:/estudios_doctoral_v2/Desarrollo_Movil/doctoral-nexus/conocimientos/chapter_11_replication_images/Database_Internals.pdf-0363-04.png)


_Figure 11-6. Write operations with no causal relationship_ 

Figure 11-7 shows an example of causally related writes. In addition to a written value, we now have to specify a logical clock value that would establish a causal order between operations. P1 starts with a write operation write(x,∅,1)→t1 , which starts from the initial value ∅ . P2 performs another write operation, write(x, t1, 2) , and specifies that it is logically ordered _after_ t1 , requiring operations to propagate _only_ in the order established by the logical clock. 


![](C:/estudios_doctoral_v2/Desarrollo_Movil/doctoral-nexus/conocimientos/chapter_11_replication_images/Database_Internals.pdf-0364-00.png)


_Figure 11-7. Causally related write operations_ 

This establishes a _causal order_ between these operations. Even if the latter write propagates faster than the former one, it isn’t made visible until all of its dependencies arrive, and the event order is reconstructed from their logical timestamps. In other words, a happened-before relationship is established logically, without using physical clocks, and all processes agree on this order. 

Figure 11-8 shows processes P1 and P2 making causally related writes, which propagate to P3 and P4 in their logical order. This prevents us from the situation shown in Figure 11-6; you can compare histories of P3 and P4 in both figures. 


![](C:/estudios_doctoral_v2/Desarrollo_Movil/doctoral-nexus/conocimientos/chapter_11_replication_images/Database_Internals.pdf-0364-04.png)


_Figure 11-8. Write operations with causal relationship_ 

You can think of this in terms of communication on some online forum: you post something online, someone sees your post and responds to it, and a third person sees this response and continues the conversation thread. It is possible for conversation threads to diverge: you can choose to respond to one of the conversations in the thread and continue the chain of events, but some threads will have only a few messages in common, so there might be no single history for all the messages. 

In a causally consistent system, we get session guarantees for the application, ensuring the view of the database is consistent with its own 

actions, even if it executes read and write requests against different, potentially inconsistent, servers [TERRY94]. These guarantees are: monotonic reads, monotonic writes, read-your-writes, writes-follow-reads. You can find more information on these session models in “Session Models”. 

Causal consistency can be implemented using logical clocks [LAMPORT78] and sending context metadata with every message, summarizing which operations logically precede the current one. When the update is received from the server, it contains the latest version of the context. Any operation can be processed only if all operations preceding it have already been applied. Messages for which contexts do not match are buffered on the server as it is too early to deliver them. 

The two prominent and frequently cited projects implementing causal consistency are Clusters of Order-Preserving Servers (COPS) [LLOYD11] and Eiger [LLOYD13]. Both projects implement causality through a library (implemented as a frontend server that users connect to) and track dependencies to ensure consistency. COPS tracks dependencies through key versions, while Eiger establishes operation order instead (operations in Eiger can depend on operations executed on the other nodes; for example, in the case of multipartition transactions). Both projects do not expose outof-order operations like eventually consistent stores might do. Instead, they detect and handle conflicts: in COPS, this is done by checking the key order and using application-specific functions, while Eiger implements the last-write-wins rule. 

#### **Vector clocks** 

Establishing causal order allows the system to reconstruct the sequence of events even if messages are delivered out of order, fill the gaps between the messages, and avoid publishing operation results in case some messages are still missing. For example, if messages {M1(∅, t1), M2(M1, t2), M3(M2, t3)} , each specifying their dependencies, are causally related and were propagated out of order, the process buffers them until it can collect all operation dependencies and restore their causal order [KINGSBURY18b]. Many databases, for example, Dynamo [DECANDIA07] and Riak [SHEEHY10a], use _vector clocks_ [LAMPORT78] [MATTERN88] for establishing causal order. 

A _vector clock_ is a structure for establishing a _partial order_ between the events, detecting and resolving divergence between the event chains. With vector clocks, we can simulate common time, global state, and represent asynchronous events as synchronous ones. Processes maintain vectors of _logical clocks_ , with one clock per process. Every clock starts at the initial value and is incremented every time a new event arrives (for example, a write occurs). When receiving clock vectors from other processes, a process updates its local vector to the highest clock values per process from the received vectors (i.e., highest clock values the transmitting node has ever seen). 

To use vector clocks for conflict resolution, whenever we make a write to the database, we first check if the value for the written key already exists locally. If the previous value already exists, we append a new version to the version vector and establish the causal relationship between the two writes. Otherwise, we start a new chain of events and initialize the value with a single version. 

We were talking about consistency in terms of access to shared memory registers and wall-clock operation ordering, and first mentioned potential replica divergence when talking about sequential consistency. Since only write operations to the same memory location have to be ordered, we cannot end up in a situation where we have a write conflict if values are independent [LAMPORT79]. 

Since we’re looking for a consistency model that would improve availability and performance, we have to allow replicas to diverge not only by serving stale reads but also by accepting potentially conflicting writes, so the system is allowed to create two independent chains of events. Figure 11-9 shows such a divergence: from the perspective of one replica, we see history as 1, 5, 7, 8 and the other one reports 1, 5, 3 . Riak allows users to see and resolve divergent histories [DAILY13]. 


![](C:/estudios_doctoral_v2/Desarrollo_Movil/doctoral-nexus/conocimientos/chapter_11_replication_images/Database_Internals.pdf-0366-04.png)


_Figure 11-9. Divergent histories under causal consistency_ 

#### **NOTE** 

To implement causal consistency, we have to store causal history, add garbage collection, and ask the user to reconcile divergent histories in case of a conflict. Vector clocks can tell you that the conflict has occurred, but do not propose exactly how to resolve it, since resolution semantics are often application-specific. Because of that, some eventually consistent databases, for example, Apache Cassandra, do not order operations causally and use the last-write-wins rule for conflict resolution instead [ELLIS13]. 

## **Session Models** 

Thinking about consistency in terms of value propagation is useful for database developers, since it helps to understand and impose required data invariants, but some things are easier understood and explained from the client point of view. We can look at our distributed system from the perspective of a single client instead of multiple clients. 

_Session models_ [VIOTTI16] (also called client-centric consistency models [TANENBAUM06]) help to reason about the state of the distributed system from the client perspective: how each client observes the state of the system while issuing read and write operations. 

If other consistency models we discussed so far focus on explaining operation ordering in the presence of concurrent clients, client-centric consistency focuses on how a single client interacts with the system. We still assume that each client’s operations are sequential: it has to finish one operation before it can start executing the next one. If the client crashes or loses connection to the server before its operation completes, we do not make any assumptions about the state of incomplete operations. 

In a distributed system, clients often can connect to any available replica and, if the results of the recent write against one replica did not propagate to the other one, the client might not be able to observe the state change it has made. 

One of the reasonable expectations is that every write issued by the client is visible to it. This assumption holds under the _read-own-writes_ consistency model, which states that every read operation following the write on the same or the other replica has to observe the updated value. For example, read(x) that was executed immediately after write(x,V) will return the value V . 

The _monotonic reads_ model restricts the value visibility and states that if the read(x) has observed the value V , the following reads have to observe a value at least as recent as V or some later value. 

The _monotonic writes_ model assumes that values originating from the same client appear in the order this client has executed them. If, according 

to the client session order, write(x,V2) was made _after_ write(x,V1) , their effects have to become visible in the same order (i.e., V1 first, and then V2 ) to _all_ other processes. Without this assumption, old data can be “resurrected,” resulting in data loss. 

_Writes-follow-reads_ (sometimes referred as session causality) ensures that writes are ordered after writes that were observed by previous read operations. For example, if write(x,V2) is ordered after read(x) that has returned V1 , write(x,V2) will be ordered _after_ write(x,V1) . 

#### **WARNING** 

Session models make _no_ assumptions about operations made by _different_ processes (clients) or from the different logical session [TANENBAUM14]. These models describe operation ordering from the point of view of a single process. However, the same guarantees have to hold for _every_ process in the system. In other words, if P1 can read its own writes, P2 should be able to read _its_ own writes, too. 

Combining monotonic reads, monotonic writes, and read-own-writes gives Pipelined RAM (PRAM) consistency [LIPTON88] [BRZEZINSKI03], also known as FIFO consistency. PRAM guarantees that write operations originating from one process will propagate in the order they were executed by this process. Unlike under sequential consistency, writes from different processes can be observed in different order. 

The properties described by client-centric consistency models are desirable and, in the majority of cases, are used by distributed systems developers to validate their systems and simplify their usage. 

## **Eventual Consistency** 

Synchronization is expensive, both in multiprocessor programming and in distributed systems. As we discussed in “Consistency Models”, we can relax consistency guarantees and use models that allow some divergence between the nodes. For example, sequential consistency allows reads to be propagated at different speeds. 

Under _eventual consistency_ , updates propagate through the system asynchronously. Formally, it states that if there are no _additional_ updates performed against the data item, _eventually_ all accesses return the latest written value [VOGELS09]. In case of a conflict, the notion of _latest_ value might change, as the values from diverged replicas are reconciled using a conflict resolution strategy, such as last-write-wins or using vector clocks (see “Vector clocks”). 

_Eventually_ is an interesting term to describe value propagation, since it specifies no hard time bound in which it has to happen. If the delivery service provides nothing more than an “eventually” guarantee, it doesn’t sound like it can be relied upon. However, in practice, this works well, and . many databases these days are described as _eventually consistent_ 

## **Tunable Consistency** 

Eventually consistent systems are sometimes described in CAP terms: you can trade availability for consistency or vice versa (see “Infamous CAP”). From the server-side perspective, eventually consistent systems usually implement tunable consistency, where data is replicated, read, and written using three variables: 

#### _Replication Factor N_ 

Number of nodes that will store a copy of data. 

#### _Write Consistency W_ 

Number of nodes that have to acknowledge a write for it to succeed. 

#### _Read Consistency R_ 

Number of nodes that have to respond to a read operation for it to succeed. 

Choosing consistency levels where ( R + W > N ), the system can guarantee returning the most recent written value, because there’s always an overlap between read and write sets. For example, if N = 3 , W = 2 , and R = 2 , the system can tolerate a failure of just one node. Two nodes out of three must acknowledge the write. In the ideal scenario, the system also asynchronously replicates the write to the third node. If the third node is down, anti-entropy mechanisms (see Chapter 12) eventually propagate it. 

During the read, two replicas out of three have to be available to serve the request for us to respond with consistent results. Any combination of nodes will give us at least one node that will have the most up-to-date record for a given key. 

#### **TIP** 

When performing a write, the coordinator should submit it to N nodes, but can wait for only W nodes before it proceeds (or W - 1 in case the coordinator is also a replica). The rest of the write operations can complete asynchronously or fail. Similarly, when performing a read, the coordinator has to collect _at least_ R responses. Some databases use speculative execution and submit extra read requests to reduce coordinator 

response latency. This means if one of the originally submitted read requests fails or arrives slowly, speculative requests can be counted toward R instead. 

Write-heavy systems may sometimes pick W = 1 and R = N , which allows writes to be acknowledged by just one node before they succeed, but would require _all_ the replicas (even potentially failed ones) to be available for reads. The same is true for the W = N , R = 1 combination: the latest value can be read from any node, as long as writes succeed only after being applied on _all_ replicas. 

Increasing read or write consistency levels increases latencies and raises requirements for node availability during requests. Decreasing them improves system availability while sacrificing consistency. 

##### **QUORUMS** 

A consistency level that consists of ⌊N/2⌋ + 1 nodes is called a _quorum_ , a majority of nodes. In the case of a network partition or node failures, in a system with 2f + 1 nodes, live nodes can continue accepting writes or reads, if up to f nodes are unavailable, until the rest of the cluster is available again. In other words, such systems can tolerate at most f node failures. 

When executing read and write operations using quorums, a system cannot tolerate failures of the majority of nodes. For example, if there are three replicas in total, and two of them are down, read and write operations won’t be able to achieve the number of nodes necessary for read and write consistency, since only one node out of three will be able to respond to the request. 

Reading and writing using quorums does not guarantee monotonicity in cases of incomplete writes. If some write operation has failed after writing a value to one replica out of three, depending on the contacted replicas, a quorum read can return either the result of the incomplete operation, or the old value. Since subsequent same-value reads are not required to contact the same replicas, values they return can alternate. To achieve read monotonicity (at the cost of availability), we have to use blocking read-repair (see “Read Repair”). 

## **Witness Replicas** 

Using quorums for read consistency helps to improve availability: even if some of the nodes are down, a database system can still accept reads and serve writes. The majority requirement guarantees that, since there’s an overlap of at least one node in any majority, any quorum read will observe the most recent completed quorum write. However, using replication and majorities increases storage costs: we have to store a copy of the data on each replica. If our replication factor is five, we have to store five copies. 

We can improve storage costs by using a concept called _witness replicas_ . Instead of storing a copy of the record on each replica, we can split replicas into _copy_ and _witness_ subsets. Copy replicas still hold data records as previously. Under normal operation, witness replicas merely store the record indicating the fact that the write operation occurred. However, a situation might occur when the number of copy replicas is too low. For example, if we have three copy replicas and two witness ones, and two copy replicas go down, we end up with a quorum of one copy and two witness replicas. 

In cases of write timeouts or copy replica failures, witness replicas can be _upgraded_ to temporarily store the record in place of failed or timed-out copy replicas. As soon as the original copy replicas recover, upgraded replicas can revert to their previous state, or recovered replicas can become witnesses. 

Let’s consider a replicated system with three nodes, two of which are holding copies of data and the third serves as a witness: [1c, 2c, 3w] . We attempt to make a write, but 2c is temporarily unavailable and cannot complete the operation. In this case, we temporarily store the record on the witness replica 3w . Whenever 2c comes back up, repair mechanisms can bring it back up-to-date and remove redundant copies from witnesses. 

In a different scenario, we can attempt to perform a read, and the record is present on 1c and 3w , but not on 2c . Since any two replicas are enough to constitute a quorum, if any subset of nodes of size two is available, whether it’s two copy replicas [1c, 2c] , or one copy replica and one witness [1c, 3w] or [2c, 3w] , we can guarantee to serve consistent 

results. If we read from [1c, 2c] , we fetch the latest record from 1c and can replicate it to 2c , since the value is missing there. In case only [2c, 3w] are available, the latest record can be fetched from 3w . To restore the original configuration and bring 2c up-to-date, the record can be replicated to it, and removed from the witness. 

More generally, having n copy and m witness replicas has same availability guarantees as n + m copies, given that we follow two rules: 

Read and write operations are performed using majorities (i.e., with N/2 + 1 participants) 

At least one of the replicas in this quorum is _necessarily_ a copy one 

This works because data is guaranteed to be either on the copy or witness replicas. Copy replicas are brought up-to-date by the repair mechanism in case of a failure, and witness replicas store the data in the interim. 

Using witness replicas helps to reduce storage costs while preserving consistency invariants. There are several implementations of this approach; for example, Spanner [CORBETT12] and Apache Cassandra. 

## **Strong Eventual Consistency and CRDTs** 

We’ve discussed several strong consistency models, such as linearizability and serializability, and a form of weak consistency: eventual consistency. A possible middle ground between the two, offering some benefits of both models, is _strong eventual consistency_ . Under this model, updates are allowed to propagate to servers late or out of order, but when all updates finally propagate to target nodes, conflicts between them can be resolved and they can be merged to produce the same valid state [GOMES17]. 

Under some conditions, we can relax our consistency requirements by allowing operations to preserve additional state that allows the diverged states to be reconciled (in other words, merged) after execution. One of the most prominent examples of such an approach is _Conflict-Free Replicated Data Types_ (CRDTs, [SHAPIRO11a]) implemented, for example, in Redis [BIYIKOGLU13]. 

CRDTs are specialized data structures that preclude the existence of conflict and allow operations on these data types to be applied in any order without changing the result. This property can be extremely useful in a distributed system. For example, in a multinode system that uses conflictfree replicated counters, we can increment counter values on each node independently, even if they cannot communicate with one another due to a network partition. As soon as communication is restored, results from all nodes can be reconciled, and none of the operations applied during the partition will be lost. 

This makes CRDTs useful in eventually consistent systems, since replica states in such systems are allowed to temporarily diverge. Replicas can execute operations locally, without prior synchronization with other nodes, and operations eventually propagate to all other replicas, potentially out of order. CRDTs allow us to reconstruct the complete system state from local individual states or operation sequences. 

The simplest example of CRDTs is operation-based Commutative Replicated Data Types (CmRDTs). For CmRDTs to work, we need the allowed operations to be: 

_Side-effect free_ 

#### Their application does not change the system state. 

#### _Commutative_ 

Argument order does not matter: x • y = y • x . In other words, it doesn’t matter whether x is merged with y , or y is merged with x . 

#### _Causally ordered_ 

Their successful delivery depends on the precondition, which ensures that the system has reached the state the operation can be applied to. For example, we could implement a _grow-only counter_ . Each server can hold a state vector consisting of last known counter updates from all other participants, initialized with zeros. Each server is only allowed to modify its own value in the vector. When updates are propagated, the function merge(state1, state2) merges the states from the two servers. 

For example, we have three servers, with initial state vectors initialized: 


![](C:/estudios_doctoral_v2/Desarrollo_Movil/doctoral-nexus/conocimientos/chapter_11_replication_images/Database_Internals.pdf-0376-06.png)


If we update counters on the first and third nodes, their states change as follows: 

Node 1:          Node 2:          Node 3: [1, 0, 0]        [0, 0, 0]        [0, 0, 1] 

When updates propagate, we use a merge function to combine the results by picking the maximum value for each slot: 

Node 1 (Node 3 state vector propagated): merge([1, 0, 0], [0, 0, 1]) = [1, 0, 1] Node 2 (Node 1 state vector propagated): merge([0, 0, 0], [1, 0, 0]) = [1, 0, 0] 

Node 2 (Node 3 state vector propagated): merge([1, 0, 0], [0, 0, 1]) = [1, 0, 1] 

Node 3 (Node 1 state vector propagated): merge([0, 0, 1], [1, 0, 0]) = [1, 0, 1] 

To determine the current vector state, the sum of values in all slots is 

computed: sum([1, 0, 1]) = 2 . The merge function is commutative. Since servers are only allowed to update their own values and these values are independent, no additional coordination is required. 

It is possible to produce a _Positive-Negative-Counter_ (PN-Counter) that supports both increments and decrements by using payloads consisting of two vectors: P , which nodes use for increments, and N , where they store decrements. In a larger system, to avoid propagating huge vectors, we can use _super-peers_ . Super-peers replicate counter states and help to avoid constant peer-to-peer chatter [SHAPIRO11b]. 

To save and replicate values, we can use _registers_ . The simplest version of the register is the _last-write-wins_ register (LWW register), which stores a unique, globally ordered timestamp attached to each value to resolve conflicts. In case of a conflicting write, we preserve only the one with the larger timestamp. The merge operation (picking the value with the largest timestamp) here is also commutative, since it relies on the timestamp. If we cannot allow values to be discarded, we can supply application-specific merge logic and use a _multivalue_ register, which stores all values that were written and allows the application to pick the right one. 

Another example of CRDTs is an unordered _grow-only_ set (G-Set). Each node maintains its local state and can append elements to it. Adding elements produces a valid set. Merging two sets is also a commutative operation. Similar to counters, we can use two sets to support both additions and removals. In this case, we have to preserve an invariant: only the values contained in the addition set can be added into the removal set. To reconstruct the current state of the set, all elements contained in the removal set are subtracted from the addition set [SHAPIRO11b]. 

An example of a conflict-free type that combines more complex structures is a conflict-free replicated JSON data type, allowing modifications such as insertions, deletions, and assignments on deeply nested JSON documents with list and map types. This algorithm performs merge operations on the client side and does not require operations to be propagated in any specific order [KLEPPMANN14]. 

There are quite a few possibilities CRDTs provide us with, and we can see more data stores using this concept to provide Strong Eventual Consistency (SEC). This is a powerful concept that we can add to our 

arsenal of tools for building fault-tolerant distributed systems. 

## **Summary** 

Fault-tolerant systems use replication to improve availability: even if some processes fail or are unresponsive, the system as a whole can continue functioning correctly. However, keeping multiple copies in sync requires additional coordination. 

We’ve discussed several single-operation consistency models, ordered from the one with the most guarantees to the one with the least:<sup>2</sup> 

#### _Linearizability_ 

Operations appear to be applied instantaneously, and the real-time operation order is maintained. 

#### _Sequential consistency_ 

Operation effects are propagated in _some_ total order, and this order is consistent with the order they were executed by the individual processes. 

#### _Causal consistency_ 

Effects of the causally related operations are visible in the same order to all processes. 

#### _PRAM/FIFO consistency_ 

Operation effects become visible in the same order they were executed by individual processes. Writes from different processes can be observed in different orders. 

After that, we discussed multiple session models: 

#### _Read-own-writes_ 

Read operations reflect the previous writes. Writes propagate through the system and become available for later reads that come from the same client. 

#### _Monotonic reads_ 

Any read that has observed a value cannot observe a value that is older that the observed one. 

#### _Monotonic writes_ 

Writes coming from the same client propagate to other clients in the order they were made by this client. 

_Writes-follow-reads_ 

Write operations are ordered after the writes whose effects were observed by the previous reads executed by the same client. 

Knowing and understanding these concepts can help you to understand the guarantees of the underlying systems and use them for application development. Consistency models describe rules that operations on data have to follow, but their scope is limited to a specific system. Stacking systems with weaker guarantees on top of ones with stronger guarantees or ignoring consistency implications of underlying systems may lead to unrecoverable inconsistencies and data loss. 

We also discussed the concept of _eventual_ and _tunable_ consistency. Quorum-based systems use majorities to serve consistent data. _Witness replicas_ can be used to reduce storage costs. 

##### **FURTHER READING** 

If you’d like to learn more about the concepts mentioned in this chapter, you can refer to the following sources: 

##### _Consistency models_ 

Perrin, Matthieu. 2017. _Distributed Systems: Concurrency and Consistency_ (1st Ed.). Elsevier, UK: ISTE Press. 

Viotti, Paolo and Marko Vukolić. 2016. “Consistency in Non-Transactional Distributed Storage Systems.” _ACM Computing Surveys_ 49, no. 1 (July): Article 19. _https://doi.org/0.1145/2926965_ . 

Bailis, Peter, Aaron Davidson, Alan Fekete, Ali Ghodsi, Joseph M. Hellerstein, and Ion Stoica. 2013. “Highly available transactions: virtues and limitations.” _Proceedings of the VLDB Endowment_ 7, no. 3 (November): 181-192. _https://doi.org/10.14778/2732232.2732237_ . 

Aguilera, M.K., and D.B. Terry. 2016. “The Many Faces of Consistency.” _Bulletin of the Technical Committee on Data Engineering_ 39, no. 1 (March): 3-13. 

- 1 Quorum reads and writes in the context of eventually consistent stores, which are discussed in more detail in “Eventual Consistency”. 

- 2 These short definitions are given for recap only, the reader is advised to refer to the complete definitions for context. 

